def defang_ip_addr(address: str) -> str:
    return address.replace(".", "[.]")
