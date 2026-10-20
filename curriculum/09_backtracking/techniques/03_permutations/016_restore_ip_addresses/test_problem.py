from solution import restore_ip_addresses


def test_restore_ip_addresses_normal():
    assert sorted(restore_ip_addresses("25525511135")) == sorted(["255.255.11.135", "255.255.111.35"])


def test_restore_ip_addresses_too_short():
    assert restore_ip_addresses("1") == []


def test_restore_ip_addresses_all_zeros():
    assert restore_ip_addresses("0000") == ["0.0.0.0"]
