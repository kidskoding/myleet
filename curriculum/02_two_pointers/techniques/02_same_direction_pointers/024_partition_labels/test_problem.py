from solution import partition_labels


def test_partition_labels_normal():
    assert partition_labels("ababcbacadefegdehijhklij") == [9, 7, 8]


def test_partition_labels_single_part():
    assert partition_labels("eccbbbbdec") == [10]
