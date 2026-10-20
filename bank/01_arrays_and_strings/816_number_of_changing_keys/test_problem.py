from solution import count_key_changes


def test_count_key_changes_example_mixed_case():
    assert count_key_changes("aAbBcC") == 2


def test_count_key_changes_example_one_key():
    assert count_key_changes("AaAaAaaA") == 0


def test_count_key_changes_single_character():
    assert count_key_changes("z") == 0


def test_count_key_changes_every_key_new():
    assert count_key_changes("abc") == 2


def test_count_key_changes_back_to_earlier_key():
    assert count_key_changes("aBbA") == 2
