from solution import ip_to_cidr


def test_ip_to_cidr_mixed_block_sizes():
    assert ip_to_cidr("255.0.0.7", 10) == ["255.0.0.7/32", "255.0.0.8/29", "255.0.0.16/32"]


def test_ip_to_cidr_unaligned_start():
    assert ip_to_cidr("117.145.102.62", 8) == ["117.145.102.62/31", "117.145.102.64/30", "117.145.102.68/31"]


def test_ip_to_cidr_single_address():
    assert ip_to_cidr("0.0.0.0", 1) == ["0.0.0.0/32"]


def test_ip_to_cidr_full_aligned_block():
    assert ip_to_cidr("0.0.0.0", 256) == ["0.0.0.0/24"]


def test_ip_to_cidr_carries_across_octet():
    assert ip_to_cidr("10.0.0.255", 2) == ["10.0.0.255/32", "10.0.1.0/32"]
