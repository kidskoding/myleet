from solution import smallest_trimmed_numbers


def test_smallest_trimmed_numbers_example_one():
    nums = ["102", "473", "251", "814"]
    assert smallest_trimmed_numbers(nums, [[1, 1], [2, 3], [4, 2], [1, 2]]) == [2, 2, 1, 0]


def test_smallest_trimmed_numbers_example_two():
    assert smallest_trimmed_numbers(["24", "37", "96", "04"], [[2, 1], [2, 2]]) == [3, 0]


def test_smallest_trimmed_numbers_single():
    assert smallest_trimmed_numbers(["5"], [[1, 1]]) == [0]


def test_smallest_trimmed_numbers_ties_by_index():
    assert smallest_trimmed_numbers(["11", "01", "21"], [[1, 1], [3, 1], [2, 2]]) == [0, 2, 0]
