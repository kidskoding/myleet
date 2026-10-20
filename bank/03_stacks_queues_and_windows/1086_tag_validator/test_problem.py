from solution import is_valid


def test_is_valid_cdata_inside_tag():
    assert is_valid("<DIV>This is the first line <![CDATA[<div>]]></DIV>") is True


def test_is_valid_stray_brackets_and_cdata():
    assert is_valid("<DIV>>>  ![cdata[]] <![CDATA[<div>]>]]>]]>>]</DIV>") is True


def test_is_valid_unbalanced_nesting():
    assert is_valid("<A>  <B> </A>   </B>") is False


def test_is_valid_two_top_level_tags():
    assert is_valid("<A></A><B></B>") is False


def test_is_valid_tag_name_too_long():
    assert is_valid("<AAAAAAAAAA></AAAAAAAAAA>") is False


def test_is_valid_unmatched_open_bracket():
    assert is_valid("<DIV>  unmatched <  </DIV>") is False


def test_is_valid_cdata_hides_end_tag():
    assert is_valid("<A><![CDATA[</A>]]></A>") is True
