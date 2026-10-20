from solution import minimum_substrings_in_partition


def test_minimum_substrings_in_partition_example_one():
    assert minimum_substrings_in_partition("fabccddg") == 3


def test_minimum_substrings_in_partition_example_two():
    assert minimum_substrings_in_partition("abababaccddb") == 2


def test_minimum_substrings_in_partition_single():
    assert minimum_substrings_in_partition("a") == 1


def test_minimum_substrings_in_partition_whole_balanced():
    assert minimum_substrings_in_partition("abab") == 1


def test_minimum_substrings_in_partition_split_needed():
    assert minimum_substrings_in_partition("aab") == 2
