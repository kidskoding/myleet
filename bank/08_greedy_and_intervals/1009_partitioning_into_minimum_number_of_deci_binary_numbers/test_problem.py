from solution import min_partitions


def test_min_partitions_two_digits():
    assert min_partitions("32") == 3


def test_min_partitions_five_digits():
    assert min_partitions("82734") == 8


def test_min_partitions_long_number():
    assert min_partitions("27346209830709182346") == 9


def test_min_partitions_single_one():
    assert min_partitions("1") == 1


def test_min_partitions_power_of_ten():
    assert min_partitions("10000") == 1
