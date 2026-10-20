from solution import network_becomes_idle


def test_network_becomes_idle_chain():
    assert network_becomes_idle([[0, 1], [1, 2]], [0, 2, 1]) == 8


def test_network_becomes_idle_patient_servers():
    assert network_becomes_idle([[0, 1], [0, 2], [1, 2]], [0, 10, 10]) == 3


def test_network_becomes_idle_one_resend():
    assert network_becomes_idle([[0, 1]], [0, 1]) == 4


def test_network_becomes_idle_no_resend():
    assert network_becomes_idle([[0, 1]], [0, 100]) == 3


def test_network_becomes_idle_long_chain_eager():
    assert network_becomes_idle([[0, 1], [1, 2], [2, 3]], [0, 1, 1, 1]) == 12


def test_network_becomes_idle_mixed_patience():
    assert network_becomes_idle([[0, 1], [1, 2], [2, 3]], [0, 5, 5, 3]) == 10
