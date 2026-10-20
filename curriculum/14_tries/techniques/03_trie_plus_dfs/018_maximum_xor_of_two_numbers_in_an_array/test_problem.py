from solution import find_maximum_xor


def test_find_maximum_xor_normal():
    assert find_maximum_xor([3, 10, 5, 25, 2, 8]) == 28


def test_find_maximum_xor_larger():
    nums = [14, 70, 53, 83, 49, 91, 36, 80, 92, 51, 66, 70]
    assert find_maximum_xor(nums) == 127
