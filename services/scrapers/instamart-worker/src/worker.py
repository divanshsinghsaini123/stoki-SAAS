import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("instamart-worker")

def main():
    logger.info("Starting Instamart worker...")

if __name__ == "__main__":
    main()
