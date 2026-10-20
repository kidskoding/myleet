from solution import apply_substitutions


def test_apply_substitutions_flat_values():
    assert apply_substitutions([["A", "abc"], ["B", "def"]], "%A%_%B%") == "abc_def"


def test_apply_substitutions_nested_value():
    replacements = [["A", "bce"], ["B", "ace"], ["C", "abc%B%"]]
    assert apply_substitutions(replacements, "%A%_%B%_%C%") == "bce_ace_abcace"


def test_apply_substitutions_single_key():
    assert apply_substitutions([["Z", "q"]], "%Z%") == "q"


def test_apply_substitutions_chain_of_dependencies():
    replacements = [["A", "x%B%"], ["B", "y%C%"], ["C", "z"]]
    assert apply_substitutions(replacements, "%A%") == "xyz"


def test_apply_substitutions_repeated_placeholder():
    replacements = [["A", "%B%%B%"], ["B", "ab"]]
    assert apply_substitutions(replacements, "%A%_%B%_%A%") == "abab_ab_abab"
