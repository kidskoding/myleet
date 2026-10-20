from solution import sort_colors


def test_sort_colors_mixed():
    nums = [2, 0, 2, 1, 1, 0]
    sort_colors(nums)
    assert nums == [0, 0, 1, 1, 2, 2]


def test_sort_colors_one_of_each():
    nums = [2, 0, 1]
    sort_colors(nums)
    assert nums == [0, 1, 2]


def test_sort_colors_single():
    nums = [0]
    sort_colors(nums)
    assert nums == [0]


def test_sort_colors_no_twos():
    nums = [1, 1, 0, 0]
    sort_colors(nums)
    assert nums == [0, 0, 1, 1]
