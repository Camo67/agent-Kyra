import time
import requests
from requests_toolbelt.adapters.source import SourceAddressAdapter
from huawei_lte_api.Client import Client
from huawei_lte_api.AuthorizedConnection import AuthorizedConnection
import argparse
import logging
from typing import Optional

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class Huawei5GRotator:
    def __init__(self, huawei_interface_ip: str, router_ip: str, router_user: str, router_pass: str):
        """
        Initializes the Huawei 5G IP Rotator
        
        Args:
            huawei_interface_ip: The IP address of the Huawei router interface on your PC
            router_ip: The IP address of the Huawei router
            router_user: The username for the Huawei router
            router_pass: The password for the Huawei router
        """
        self.huawei_interface_ip = huawei_interface_ip
        self.router_ip = router_ip
        self.router_user = router_user
        self.router_pass = router_pass
        self.session = None

    def create_scraping_session(self):
        """Creates a requests session locked to the 5G router interface"""
        self.session = requests.Session()
        # This forces the traffic out of the specific Huawei ethernet port
        adapter = SourceAddressAdapter(self.huawei_interface_ip)
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        logger.info(f"Created scraping session bound to interface {self.huawei_interface_ip}")
        return self.session

    def rotate_5g_ip(self):
        """Logs into the Huawei router and forces a reboot to grab a fresh IP"""
        logger.info("Initiating router reboot for IP rotation...")
        try:
            connection = AuthorizedConnection(self.router_ip, self.router_user, self.router_pass)
            client = Client(connection)
            
            # Trigger the reboot command via the Huawei API
            client.device.reboot()
            logger.info("Reboot command sent! Waiting 90 seconds for connection to restore...")
            
            # Wait for the router to turn off, boot up, and reconnect to the 5G tower
            time.sleep(90)
            logger.info("Network should be restored with a new IP.")
        except Exception as e:
            logger.error(f"Failed to reboot router. Error: {e}")
            raise

    def check_current_ip(self) -> Optional[str]:
        """Checks the current public IP address"""
        try:
            if not self.session:
                self.create_scraping_session()
                
            response = self.session.get("https://api.ipify.org", timeout=10)
            current_ip = response.text.strip()
            logger.info(f"Current 5G Public IP: {current_ip}")
            return current_ip
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to check current IP: {e}")
            return None

    def scrape_with_rotation(self, target_url: str, max_attempts: int = 3):
        """
        Perform scraping with automatic IP rotation on failure
        
        Args:
            target_url: The URL to scrape
            max_attempts: Maximum number of attempts including retries with new IPs
        """
        for attempt in range(max_attempts):
            logger.info(f"Attempt {attempt + 1}/{max_attempts} to scrape {target_url}")
            
            try:
                if not self.session:
                    self.create_scraping_session()
                    
                response = self.session.get(target_url, timeout=30)
                
                if response.status_code == 200:
                    logger.info(f"Successfully scraped {target_url}")
                    return response
                elif response.status_code == 429:  # Rate limited
                    logger.warning(f"Rate limited (429) on attempt {attempt + 1}, rotating IP...")
                    if attempt < max_attempts - 1:  # Don't rotate on the last attempt
                        self.rotate_5g_ip()
                        continue
                else:
                    logger.warning(f"Received status code {response.status_code} on attempt {attempt + 1}")
                    if attempt < max_attempts - 1:
                        self.rotate_5g_ip()
                        continue
                        
            except requests.exceptions.RequestException as e:
                logger.error(f"Network error on attempt {attempt + 1}: {e}")
                if attempt < max_attempts - 1:
                    logger.info("Rotating IP and retrying...")
                    self.rotate_5g_ip()
                    continue
                    
        logger.error(f"Failed to scrape {target_url} after {max_attempts} attempts")
        return None

def main():
    parser = argparse.ArgumentParser(description="Huawei 5G IP Rotator for Scraping")
    parser.add_argument("--interface-ip", required=True, help="Huawei interface IP (e.g., 192.168.8.100)")
    parser.add_argument("--router-ip", default="http://192.168.8.1", help="Router IP (default: http://192.168.8.1)")
    parser.add_argument("--router-user", default="admin", help="Router username (default: admin)")
    parser.add_argument("--router-pass", required=True, help="Router password")
    parser.add_argument("--target-url", help="Target URL to scrape")
    parser.add_argument("--check-ip", action="store_true", help="Check current public IP")
    parser.add_argument("--rotate-only", action="store_true", help="Rotate IP only without scraping")
    
    args = parser.parse_args()
    
    rotator = Huawei5GRotator(
        huawei_interface_ip=args.interface_ip,
        router_ip=args.router_ip,
        router_user=args.router_user,
        router_pass=args.router_pass
    )
    
    if args.check_ip:
        rotator.check_current_ip()
    
    if args.rotate_only:
        rotator.rotate_5g_ip()
    
    if args.target_url:
        result = rotator.scrape_with_rotation(args.target_url)
        if result:
            print(f"Scraping successful! Retrieved {len(result.text)} characters")
        else:
            print("Scraping failed after all attempts")

if __name__ == "__main__":
    main()