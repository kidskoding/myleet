from solution import count_good_substrings


def test_count_good_substrings_one():
    assert count_good_substrings("xyzzaz") == 1


def test_count_good_substrings_several():
    assert count_good_substrings("aababcabc") == 4
