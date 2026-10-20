from solution import network_delay_time


def test_network_delay_time_normal_case():
    times = [[2, 1, 1], [2, 3, 1], [3, 4, 1]]

    assert network_delay_time(times, 4, 2) == 2


def test_network_delay_time_unreachable_node():
    assert network_delay_time([[1, 2, 1]], 2, 2) == -1


def test_network_delay_time_single_node():
    assert network_delay_time([], 1, 1) == 0
