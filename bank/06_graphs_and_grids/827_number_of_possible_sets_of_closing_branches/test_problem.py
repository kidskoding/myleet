from solution import number_of_sets


def test_number_of_sets_example_one():
    assert number_of_sets(3, 5, [[0, 1, 2], [1, 2, 10], [0, 2, 10]]) == 5


def test_number_of_sets_example_parallel_roads():
    assert number_of_sets(3, 5, [[0, 1, 20], [0, 1, 10], [1, 2, 2], [0, 2, 2]]) == 7


def test_number_of_sets_example_single_branch():
    assert number_of_sets(1, 10, []) == 2


def test_number_of_sets_everything_close():
    assert number_of_sets(2, 1, [[0, 1, 1]]) == 4


def test_number_of_sets_pair_too_far():
    assert number_of_sets(2, 4, [[0, 1, 5]]) == 3


def test_number_of_sets_closing_middle_disconnects():
    assert number_of_sets(3, 5, [[0, 1, 1], [1, 2, 1]]) == 7
