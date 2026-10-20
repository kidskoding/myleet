from solution import merge


def test_merge_both_empty():
    nums1: list[int] = []
    nums2: list[int] = []
    merge(nums1, 0, nums2, 0)
    assert nums1 == []


def test_merge_second_empty():
    nums1 = [1, 2, 3]
    nums2: list[int] = []
    merge(nums1, 3, nums2, 0)
    assert nums1 == [1, 2, 3]


def test_merge_first_empty():
    nums1 = [0, 0, 0]
    nums2 = [1, 2, 3]
    merge(nums1, 0, nums2, 3)
    assert nums1 == [1, 2, 3]


def test_merge_normal():
    nums1 = [1, 2, 3, 0, 0, 0]
    nums2 = [2, 5, 6]
    merge(nums1, 3, nums2, 3)
    assert nums1 == [1, 2, 2, 3, 5, 6]
