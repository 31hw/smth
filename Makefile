.PHONY: run test seed lint clean install

install:
	python -m pip install -r requirements.txt
	python -m pip install -r requirements-dev.txt

run:
	python run.py

test:
	python -m pytest tests -v

seed:
	python tools/seed-demo.py --approve

lint:
	python -m compileall app tools tests
	python tools/check-env.py

clean:
	find . -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null || true
	rm -rf .pytest_cache

db-backup:
	python tools/backup.py

make-admin:
	@python tools/make-admin.py $(USER)
