from pathlib import Path
root=Path(__file__).parents[1]
assert (root/'src/main.js').exists()
assert len(list((root/'src').rglob('*.js'))) >= 30
assert len(list((root/'styles').rglob('*.css'))) >= 4
print('local smoke ok')
