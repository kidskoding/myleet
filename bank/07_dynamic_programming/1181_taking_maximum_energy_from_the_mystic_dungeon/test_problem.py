from solution import maximum_energy


def test_maximum_energy_example():
    assert maximum_energy([5, 2, -10, -5, 1], 3) == 3


def test_maximum_energy_all_negative():
    assert maximum_energy([-2, -3, -1], 2) == -1


def test_maximum_energy_take_everything():
    assert maximum_energy([1, 2, 3], 1) == 6


def test_maximum_energy_skip_negative():
    assert maximum_energy([5, -10, 4], 2) == 9


def test_maximum_energy_last_only():
    assert maximum_energy([-5, -1], 1) == -1
