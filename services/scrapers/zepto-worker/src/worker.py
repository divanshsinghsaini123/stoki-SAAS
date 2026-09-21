import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("zepto-worker")

def main():
    logger.info("Starting Zepto worker...")

if __name__ == "__main__":
    main()
