# Kyra AI Stack Scripts

This directory contains various scripts for managing and extending the Kyra AI system.

## Huawei 5G IP Rotator Script

The `huawei-5g-ip-rotator.py` script allows you to rotate IP addresses on a Huawei 5G router for scraping purposes. This is especially useful when you need to bypass rate limits or IP-based blocking.

### Installation

Before using the script, you need to install the required dependencies:

```bash
pip install requests requests-toolbelt huawei-lte-api
```

### Usage

#### Basic Usage

```bash
python huawei-5g-ip-rotator.py --interface-ip 192.168.8.100 --router-pass your_router_password --target-url https://example.com
```

#### Check Current IP

```bash
python huawei-5g-ip-rotator.py --interface-ip 192.168.8.100 --router-pass your_router_password --check-ip
```

#### Rotate IP Only

```bash
python huawei-5g-ip-rotator.py --interface-ip 192.168.8.100 --router-pass your_router_password --rotate-only
```

#### Full Command with Custom Router Details

```bash
python huawei-5g-ip-rotator.py \
  --interface-ip 192.168.8.100 \
  --router-ip http://192.168.8.1 \
  --router-user admin \
  --router-pass your_router_password \
  --target-url https://example.com
```

### Configuration

The script requires the following parameters:

- `--interface-ip`: The IP address assigned to your PC's Ethernet port connected to the Huawei router (e.g., 192.168.8.100)
- `--router-pass`: The password for your Huawei router
- `--router-ip`: The IP address of your Huawei router (default: http://192.168.8.1)
- `--router-user`: The username for your Huawei router (default: admin)

Optional parameters:

- `--target-url`: The URL to scrape
- `--check-ip`: Check the current public IP
- `--rotate-only`: Rotate the IP without scraping

### How It Works

1. The script creates a requests session bound to the specified Huawei interface IP
2. When IP rotation is needed, it connects to the Huawei router via its API
3. It sends a reboot command to the router to acquire a new IP address
4. It waits for the router to come back online (approximately 90 seconds)
5. It continues with the scraping process using the new IP

### Security Notes

- Store your router credentials securely
- Only run this script on trusted networks
- Be aware of your ISP's terms of service regarding scraping activities

### Requirements

- Python 3.7+
- Huawei 5G router with API access enabled
- The script must be run from a machine connected to the Huawei router