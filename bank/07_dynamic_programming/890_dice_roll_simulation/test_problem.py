from solution import die_simulator


def test_die_simulator_example_one():
    assert die_simulator(2, [1, 1, 2, 2, 2, 3]) == 34


def test_die_simulator_no_repeats_allowed():
    assert die_simulator(2, [1, 1, 1, 1, 1, 1]) == 30


def test_die_simulator_three_rolls():
    assert die_simulator(3, [1, 1, 1, 2, 2, 3]) == 181


def test_die_simulator_single_roll():
    assert die_simulator(1, [1, 1, 1, 1, 1, 1]) == 6


def test_die_simulator_no_repeats_four_rolls():
    assert die_simulator(4, [1, 1, 1, 1, 1, 1]) == 750


def test_die_simulator_unconstrained():
    assert die_simulator(3, [3, 3, 3, 3, 3, 3]) == 216
