import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("bigbasket-worker")

def main():
    logger.info("Starting BigBasket worker...")

if __name__ == "__main__":
    main()
