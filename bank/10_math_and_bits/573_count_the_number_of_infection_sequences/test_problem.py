from solution import number_of_sequence


def test_number_of_sequence_example_one():
    assert number_of_sequence(5, [0, 4]) == 4


def test_number_of_sequence_example_two():
    assert number_of_sequence(4, [1]) == 3


def test_number_of_sequence_one_healthy():
    assert number_of_sequence(3, [0, 2]) == 1


def test_number_of_sequence_minimum_line():
    assert number_of_sequence(2, [0]) == 1


def test_number_of_sequence_two_edge_runs():
    assert number_of_sequence(6, [2]) == 10


def test_number_of_sequence_one_inner_run():
    assert number_of_sequence(7, [0, 6]) == 16
