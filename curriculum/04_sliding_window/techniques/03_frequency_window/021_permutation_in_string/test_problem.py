from solution import check_inclusion


def test_check_inclusion_true():
    assert check_inclusion("ab", "eidbaooo") is True


def test_check_inclusion_false():
    assert check_inclusion("ab", "eidboaoo") is False


def test_check_inclusion_match_at_end():
    assert check_inclusion("adc", "dcda") is True


def test_check_inclusion_s1_longer_than_s2():
    assert check_inclusion("abcd", "ab") is False
