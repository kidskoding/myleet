from solution import valid_ip_address


def test_valid_ip_address_ipv4():
    assert valid_ip_address("172.16.254.1") == "IPv4"
    assert valid_ip_address("0.0.0.0") == "IPv4"


def test_valid_ip_address_ipv6():
    assert valid_ip_address("2001:0db8:85a3:0:0:8A2E:0370:7334") == "IPv6"
    assert valid_ip_address("2001:db8:85a3:0000:0:8a2e:370:7334") == "IPv6"


def test_valid_ip_address_out_of_range():
    assert valid_ip_address("256.256.256.256") == "Neither"


def test_valid_ip_address_leading_zero_and_empty_parts():
    assert valid_ip_address("01.1.1.1") == "Neither"
    assert valid_ip_address("1.1.1.1.") == "Neither"
    assert valid_ip_address("1..1.1") == "Neither"


def test_valid_ip_address_bad_ipv6():
    assert valid_ip_address("2001:0db8:85a3::8A2E:037j:7334") == "Neither"
    assert valid_ip_address("02001:0db8:85a3:0000:0000:8a2e:0370:7334") == "Neither"
    assert valid_ip_address("2001:0db8:85a3:0:0:8A2E:0370:7334:") == "Neither"


def test_valid_ip_address_garbage():
    assert valid_ip_address("") == "Neither"
    assert valid_ip_address("1e1.4.5.6") == "Neither"
    assert valid_ip_address("1.2.3.-4") == "Neither"
    assert valid_ip_address("12..33.4") == "Neither"
