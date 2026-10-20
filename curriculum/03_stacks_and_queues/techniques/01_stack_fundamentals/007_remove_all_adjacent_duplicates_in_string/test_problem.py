from solution import remove_duplicates


def test_remove_duplicates_normal():
    assert remove_duplicates("abbaca") == "ca"


def test_remove_duplicates_inner_pair():
    assert remove_duplicates("azxxzy") == "ay"
