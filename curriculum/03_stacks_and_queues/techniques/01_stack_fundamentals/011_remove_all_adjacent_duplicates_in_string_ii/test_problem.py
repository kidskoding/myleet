from solution import remove_duplicates_ii


def test_remove_duplicates_ii_no_removal():
    assert remove_duplicates_ii("abcd", 2) == "abcd"


def test_remove_duplicates_ii_cascading():
    assert remove_duplicates_ii("deeedbbcccbdaa", 3) == "aa"


def test_remove_duplicates_ii_pairs():
    assert remove_duplicates_ii("pbbcggttciiippooaais", 2) == "ps"
