import logging


# Extract podId (the dark store ID) and cartAllowedQuantity.quantityLimitBreachedMessage (which reveals if the store's stock is running critically low) into your platform_metadata JSONB column.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("instamart-worker")

def main():
    logger.info("Starting Instamart worker...")

if __name__ == "__main__":
    main()
