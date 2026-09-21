import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("blinkit-worker")

def main():
    logger.info("Starting Blinkit worker...")

if __name__ == "__main__":
    main()
