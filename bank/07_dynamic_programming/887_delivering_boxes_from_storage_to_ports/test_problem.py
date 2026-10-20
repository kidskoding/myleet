from solution import box_delivering


def test_box_delivering_one_trip():
    assert box_delivering([[1, 1], [2, 1], [1, 1]], 2, 3, 3) == 4


def test_box_delivering_split_by_limits():
    assert box_delivering([[1, 2], [3, 3], [3, 1], [3, 1], [2, 4]], 3, 3, 6) == 6


def test_box_delivering_group_by_port():
    assert box_delivering([[1, 4], [1, 2], [2, 1], [2, 1], [3, 2], [3, 4]], 3, 6, 7) == 6


def test_box_delivering_single_box():
    assert box_delivering([[1, 5]], 1, 1, 5) == 2


def test_box_delivering_same_port_one_trip():
    assert box_delivering([[1, 1], [1, 1], [1, 1]], 1, 3, 3) == 2


def test_box_delivering_larger_mix():
    boxes = [[2, 4], [2, 5], [3, 1], [3, 2], [3, 7], [3, 1], [4, 4], [1, 3], [5, 2]]
    assert box_delivering(boxes, 5, 5, 7) == 14
