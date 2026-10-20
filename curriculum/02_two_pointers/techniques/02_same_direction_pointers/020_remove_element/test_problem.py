from solution import remove_element


def test_remove_element_empty():
    nums: list[int] = []
    assert remove_element(nums, 5) == 0


def test_remove_element_single_match():
    nums = [5]
    k = remove_element(nums, 5)
    assert k == 0


def test_remove_element_single_no_match():
    nums = [3]
    k = remove_element(nums, 5)
    assert k == 1
    assert nums[:k] == [3]


def test_remove_element_normal():
    nums = [3, 2, 2, 3]
    k = remove_element(nums, 3)
    assert k == 2
    assert sorted(nums[:k]) == [2, 2]
