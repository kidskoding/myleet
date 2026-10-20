from solution import find_least_num_of_unique_ints


def test_find_least_num_of_unique_ints_removes_one():
    assert find_least_num_of_unique_ints([5, 5, 4], 1) == 1


def test_find_least_num_of_unique_ints_removes_three():
    assert find_least_num_of_unique_ints([4, 3, 1, 1, 3, 3, 2], 3) == 2
