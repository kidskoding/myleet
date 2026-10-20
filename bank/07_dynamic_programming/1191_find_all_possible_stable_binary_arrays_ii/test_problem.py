from solution import number_of_stable_arrays


def test_number_of_stable_arrays_one_each():
    assert number_of_stable_arrays(1, 1, 2) == 2


def test_number_of_stable_arrays_forced_alternation():
    assert number_of_stable_arrays(1, 2, 1) == 1


def test_number_of_stable_arrays_three_and_three():
    assert number_of_stable_arrays(3, 3, 2) == 14


def test_number_of_stable_arrays_impossible():
    assert number_of_stable_arrays(3, 1, 1) == 0


def test_number_of_stable_arrays_limit_not_binding():
    assert number_of_stable_arrays(2, 3, 5) == 10


def test_number_of_stable_arrays_medium():
    assert number_of_stable_arrays(5, 5, 2) == 84
