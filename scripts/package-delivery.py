#!/usr/bin/env python3
"""Create an allowlisted, secret-free delivery directory and ZIP using only stdlib."""
from pathlib import Path
import hashlib
import re
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'entrega'
ARCHIVE = ROOT / 'entrega.zip'
DOCS = ['CHALLENGE', 'AUTHENTICATION', 'DECISIONS', 'CONTRACTS', 'EVENTS_AND_HASH',
        'FINANCIAL_PROCESSING', 'FINANCIAL_SCHEMA', 'HTTP_API', 'MESSAGING',
        'OBSERVABILITY', 'REFERENCE_SCHEDULER', 'IMAGES', 'TEST_STRATEGY']
FILES = ['package.json', 'bun.lock', '.bun-version', 'tsconfig.json',
         'tsconfig.build.json', 'Dockerfile', 'compose.yaml', 'compose.app.yaml',
         '.env.example', 'LICENSE', 'SECURITY.md', 'scripts/migrate.ts',
         'scripts/smoke-delivery.ts', 'docker/localstack/init-queues.sh']
# Refuse to remove an existing directory: it might now contain a recipient's data.
if DEST.exists():
    raise SystemExit('entrega/ já existe. Preserve-a ou renomeie-a antes de gerar outra entrega.')
if ARCHIVE.exists():
    raise SystemExit('entrega.zip já existe. Preserve-o ou renomeie-o antes de gerar outro arquivo.')
DEST.mkdir()

def copy(relative):
    source = ROOT / relative
    if source.is_symlink():
        raise ValueError(f'Symlink não permitido: {relative}')
    target = DEST / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)

for relative in FILES:
    copy(relative)
for directory in ['src', 'tests']:
    for source in sorted((ROOT / directory).rglob('*')):
        if source.is_file() and source.suffix == '.ts' and source.name != 'load-runner.test.ts':
            copy(source.relative_to(ROOT))
for name in DOCS:
    copy(f'docs/{name}.md')
# Benchmarks are optional and intentionally absent; dependency versions/lock remain identical.
import json
package = json.loads((DEST / 'package.json').read_text())
package['scripts'].pop('test:load', None)
(DEST / 'package.json').write_text(json.dumps(package, indent=2) + '\n')
for source in (ROOT / 'scripts/delivery').iterdir():
    if source.is_file():
        shutil.copy2(source, DEST / source.name)
# Use a delivery-specific image tag instead of overwriting the development tag.
compose = DEST / 'compose.app.yaml'
compose.write_text(compose.read_text().replace('backend-ballance:local', 'backend-ballance-entrega:local'))
# Keep runtime as the default final target; validation is an explicit intermediate target.
dockerfile = (DEST / 'Dockerfile').read_text()
marker = next(line for line in dockerfile.splitlines() if line.endswith(' AS runtime'))
validation = 'FROM build AS validation\nCOPY tests ./tests\nCOPY scripts ./scripts\nCMD ["bun", "test", "tests/unit", "tests/integration"]\n\n'
(DEST / 'Dockerfile').write_text(dockerfile.replace(marker, validation + marker, 1))
# Report only the functional suite shipped here, not the larger development history.
strategy = DEST / 'docs/TEST_STRATEGY.md'
body = strategy.read_text().split('## Unidade', 1)[1]
strategy.write_text('# Estratégia de testes e evidências\n\nEsta edição inclui a suíte funcional obrigatória (unidade, integração, concorrência e recuperação com PostgreSQL/SQS reais). Os dois controles específicos do runner exploratório de carga não são distribuídos. Consulte [VALIDACAO.md](../VALIDACAO.md) para os resultados efetivamente obtidos nesta montagem e [README.md](../README.md) para reproduzir a execução em containers. O resultado histórico da suíte ampliada do repositório não deve ser confundido com o conteúdo deste pacote.\n\n## Unidade' + body)
# Links to development history/optional reports are plain references in this smaller edition.
for document in [DEST / 'ARCHITECTURE.md', *sorted((DEST / 'docs').glob('*.md'))]:
    if document.name == 'CHALLENGE.md':
        continue  # Preserve the challenge verbatim.
    def fix_link(match):
        label, target = match.groups()
        if '://' in target or target.startswith('#'):
            return match.group(0)
        if (document.parent / target.split('#')[0]).exists():
            return match.group(0)
        return label + ' (material complementar do repositório de desenvolvimento)'
    document.write_text(re.sub(r'\[([^\]]+)\]\(([^)]+)\)', fix_link, document.read_text()))
(DEST / 'SHA256SUMS').write_text(''.join(
    hashlib.sha256(file.read_bytes()).hexdigest() + '  ' + file.relative_to(DEST).as_posix() + '\n'
    for file in sorted(DEST.rglob('*')) if file.is_file()
))
with zipfile.ZipFile(ARCHIVE, 'x', compression=zipfile.ZIP_DEFLATED) as out:
    for file in sorted(DEST.rglob('*')):
        if file.is_file():
            out.write(file, Path('entrega') / file.relative_to(DEST))
print(f'Gerados {DEST} e {ARCHIVE} ({ARCHIVE.stat().st_size:,} bytes).')
