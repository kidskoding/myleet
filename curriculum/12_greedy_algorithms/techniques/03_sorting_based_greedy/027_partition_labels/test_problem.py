from solution import partition_labels


def test_partition_labels_normal():
    assert partition_labels("ababcbacadefegdehijhklij") == [9, 7, 8]


def test_partition_labels_all_unique():
    assert partition_labels("abcd") == [1, 1, 1, 1]


def test_partition_labels_single_char():
    assert partition_labels("a") == [1]


def test_partition_labels_empty():
    assert partition_labels("") == []
