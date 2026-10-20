from solution import network_delay_time


def test_network_delay_time_reaches_all():
    assert network_delay_time([[2, 1, 1], [2, 3, 1], [3, 4, 1]], 4, 2) == 2


def test_network_delay_time_unreachable():
    assert network_delay_time([[1, 2, 1]], 2, 2) == -1
