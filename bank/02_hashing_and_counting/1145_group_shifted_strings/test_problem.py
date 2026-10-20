from solution import group_strings


def normalize(groups):
    return sorted(sorted(group) for group in groups)


def test_group_strings_mixed_lengths():
    strings = ["abc", "bcd", "acef", "xyz", "az", "ba", "a", "z"]
    expected = [["a", "z"], ["abc", "bcd", "xyz"], ["acef"], ["az", "ba"]]
    assert normalize(group_strings(strings)) == expected


def test_group_strings_single_string():
    assert normalize(group_strings(["a"])) == [["a"]]


def test_group_strings_duplicates_stay_together():
    assert normalize(group_strings(["ab", "ab", "bc"])) == [["ab", "ab", "bc"]]


def test_group_strings_wraparound():
    assert normalize(group_strings(["yza", "abc", "zab", "aab"])) == [["aab"], ["abc", "yza", "zab"]]


def test_group_strings_same_length_different_pattern():
    assert normalize(group_strings(["ac", "bd", "ab", "zb"])) == [["ab"], ["ac", "bd", "zb"]]
