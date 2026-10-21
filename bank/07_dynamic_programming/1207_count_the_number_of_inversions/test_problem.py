from solution import number_of_permutations


def test_number_of_permutations_example_one():
    assert number_of_permutations(3, [[2, 2], [0, 0]]) == 2


def test_number_of_permutations_example_two():
    assert number_of_permutations(3, [[2, 2], [1, 1], [0, 0]]) == 1


def test_number_of_permutations_impossible():
    assert number_of_permutations(2, [[0, 0], [1, 0]]) == 1


def test_number_of_permutations_zero_inversions():
    assert number_of_permutations(3, [[2, 0]]) == 1
