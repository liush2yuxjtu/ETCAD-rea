"""Run tests and the real UI against a fresh, owned server; retain raw evidence."""
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import time
from urllib.request import urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs/verification'
OUT.mkdir(parents=True, exist_ok=True)
port = int(os.environ.get('VERIFY_PORT', '4187'))
base = f'http://127.0.0.1:{port}'
paths = [ROOT/'index.html', ROOT/'package.json', *sorted((ROOT/'src').glob('*')), *sorted((ROOT/'tests').glob('*.mjs')), *sorted((ROOT/'tools').glob('*.py')), *sorted((ROOT/'tools').glob('*.mjs'))]
hashes = {str(path.relative_to(ROOT)):hashlib.sha256(path.read_bytes()).hexdigest() for path in paths}
(OUT/'source-manifest.json').write_text(json.dumps(hashes,indent=2)+'\n')
results = []
log = (OUT/'commands.log').open('w')


def run(command, env=None):
    log.write('$ ' + ' '.join(command) + '\n'); log.flush()
    result = subprocess.run(command,cwd=ROOT,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
    log.write(result.stdout);log.write(f'EXIT_CODE={result.returncode}\n\n');log.flush()
    results.append({'command':command,'exitCode':result.returncode})
    print(result.stdout,flush=True)
    if result.returncode:
        raise RuntimeError('Verification failed: '+' '.join(command))


server = None
started = time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())
verdict = 'FAIL'
try:
    run(['npm','test'])
    run(['npm','run','check'])
    with socket.socket() as check:
        check.bind(('127.0.0.1',port))
    server_log = (OUT/'app-server.log').open('w')
    env = {**os.environ,'PORT':str(port)}
    server = subprocess.Popen(['node','tools/serve.mjs'],cwd=ROOT,env=env,stdout=server_log,stderr=subprocess.STDOUT)
    ready = False
    for _ in range(50):
        if server.poll() is not None:raise RuntimeError('Server exited during startup')
        try:
            with urlopen(base,timeout=1) as response:ready = response.status == 200
        except OSError:pass
        if ready:break
        time.sleep(.1)
    if not ready:raise RuntimeError('Server readiness failed')
    http_checks=[]
    for path,expected,mime in [('/',200,'text/html'),('/src/app.js',200,'text/javascript'),('/.git/config',404,None),('/src/%2e%2e/README.md',404,None),('/src/missing.js',404,None)]:
        try:
            with urlopen(base+path,timeout=5) as response:status=response.status;content_type=response.headers['Content-Type']
        except HTTPError as error:status=error.code;content_type=error.headers.get('Content-Type')
        assert status==expected,(path,status)
        if mime:assert content_type.startswith(mime),(path,content_type)
        http_checks.append({'path':path,'status':status,'contentType':content_type})
    (OUT/'http-checks.json').write_text(json.dumps(http_checks,indent=2)+'\n')
    run(['npm','run','verify:ui'],env={**os.environ,'VERIFY_URL':base})
    for path,expected in hashes.items():assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==expected, f'Source changed during verification: {path}'
    verdict='PASS'
finally:
    if server and server.poll() is None:server.terminate();server.wait(timeout=10)
    if server:server_log.close()
    summary={'verdict':verdict,'startedAtUtc':started,'endedAtUtc':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'url':base,'commands':results,'candidate':'working-tree source bytes in source-manifest.json','cleanup':'Owned server terminated; UI runner closes isolated browser context'}
    (OUT/'execution.json').write_text(json.dumps(summary,indent=2)+'\n')
    log.close()
print('PASS: local tests, syntax, real UI and HTTP boundary; server stopped.')
