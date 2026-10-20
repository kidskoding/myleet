from solution import defang_ip_addr


def test_defang_ip_addr_ones():
    assert defang_ip_addr("1.1.1.1") == "1[.]1[.]1[.]1"


def test_defang_ip_addr_mixed_lengths():
    assert defang_ip_addr("255.100.50.0") == "255[.]100[.]50[.]0"


def test_defang_ip_addr_zeros():
    assert defang_ip_addr("0.0.0.0") == "0[.]0[.]0[.]0"


def test_defang_ip_addr_private_range():
    assert defang_ip_addr("192.168.1.255") == "192[.]168[.]1[.]255"
