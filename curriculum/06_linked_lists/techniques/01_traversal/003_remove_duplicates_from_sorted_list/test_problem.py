from list_node import ListNode
from solution import delete_duplicates


def build_list(values: list[int]) -> ListNode | None:
    dummy = ListNode()
    curr = dummy
    for value in values:
        curr.next = ListNode(value)
        curr = curr.next
    return dummy.next


def to_list(head: ListNode | None) -> list[int]:
    values = []
    while head:
        values.append(head.val)
        head = head.next
    return values


def test_delete_duplicates_empty():
    assert delete_duplicates(None) is None


def test_delete_duplicates_no_dupes():
    assert to_list(delete_duplicates(build_list([1, 2, 3]))) == [1, 2, 3]


def test_delete_duplicates_with_dupes():
    assert to_list(delete_duplicates(build_list([1, 1, 2, 3, 3]))) == [1, 2, 3]
