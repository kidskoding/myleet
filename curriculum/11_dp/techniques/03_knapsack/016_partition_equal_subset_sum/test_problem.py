from solution import can_partition


def test_can_partition_empty():
    assert can_partition([]) is True


def test_can_partition_normal_true():
    assert can_partition([1, 5, 11, 5]) is True


def test_can_partition_normal_false():
    assert can_partition([1, 2, 3, 5]) is False


def test_can_partition_single_element():
    assert can_partition([1]) is False
