from solution import minimum_boxes


def test_minimum_boxes_three():
    assert minimum_boxes(3) == 3


def test_minimum_boxes_four():
    assert minimum_boxes(4) == 3


def test_minimum_boxes_ten():
    assert minimum_boxes(10) == 6


def test_minimum_boxes_one():
    assert minimum_boxes(1) == 1
