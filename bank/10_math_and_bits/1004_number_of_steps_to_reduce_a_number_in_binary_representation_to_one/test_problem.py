from solution import num_steps


def test_num_steps_example():
    assert num_steps("1101") == 6


def test_num_steps_power_of_two():
    assert num_steps("10") == 1


def test_num_steps_already_one():
    assert num_steps("1") == 0


def test_num_steps_two_ones():
    assert num_steps("11") == 3


def test_num_steps_all_ones():
    assert num_steps("1111") == 5


def test_num_steps_mixed():
    assert num_steps("100110") == 9
