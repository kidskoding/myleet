from solution import get_concatenation


def test_get_concatenation_example_one():
    assert get_concatenation([1, 2, 1]) == [1, 2, 1, 1, 2, 1]


def test_get_concatenation_example_two():
    assert get_concatenation([1, 3, 2, 1]) == [1, 3, 2, 1, 1, 3, 2, 1]


def test_get_concatenation_single():
    assert get_concatenation([5]) == [5, 5]


def test_get_concatenation_does_not_mutate_input():
    nums = [4, 6]
    assert get_concatenation(nums) == [4, 6, 4, 6]
    assert nums == [4, 6]
