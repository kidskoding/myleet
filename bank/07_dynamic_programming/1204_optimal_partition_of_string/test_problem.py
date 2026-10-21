from solution import partition_string


def test_partition_string_example_one():
    assert partition_string("abacaba") == 4


def test_partition_string_example_two():
    assert partition_string("ssssss") == 6


def test_partition_string_all_unique():
    assert partition_string("abcdef") == 1


def test_partition_string_single():
    assert partition_string("z") == 1


def test_partition_string_two_same():
    assert partition_string("aa") == 2
