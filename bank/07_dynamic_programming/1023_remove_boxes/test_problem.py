from solution import remove_boxes


def test_remove_boxes_example():
    assert remove_boxes([1, 3, 2, 2, 2, 3, 4, 3, 1]) == 23


def test_remove_boxes_one_color():
    assert remove_boxes([1, 1, 1]) == 9


def test_remove_boxes_single():
    assert remove_boxes([1]) == 1


def test_remove_boxes_merge_around_middle():
    assert remove_boxes([1, 2, 1]) == 5


def test_remove_boxes_all_distinct():
    assert remove_boxes([1, 2, 3, 4]) == 4


def test_remove_boxes_interleaved():
    assert remove_boxes([1, 2, 1, 2, 1]) == 11
