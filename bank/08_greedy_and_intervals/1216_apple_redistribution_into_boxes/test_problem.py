from solution import minimum_boxes


def test_minimum_boxes_example_one():
    assert minimum_boxes([1, 3, 2], [4, 3, 1, 5, 2]) == 2


def test_minimum_boxes_example_two():
    assert minimum_boxes([5, 5, 5], [2, 4, 2, 7]) == 4


def test_minimum_boxes_one_box_enough():
    assert minimum_boxes([1, 1], [10, 1]) == 1


def test_minimum_boxes_exact_fit():
    assert minimum_boxes([3, 2, 1, 3, 1], [3, 5, 3, 5, 5]) == 2


def test_minimum_boxes_single():
    assert minimum_boxes([1], [1]) == 1
